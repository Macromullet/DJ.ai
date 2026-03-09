// =============================================================================
// DJ.ai Infrastructure — Hardened Deployment
// =============================================================================
// FIC (Federated Identity Credential) Permission Requirements:
//   The GitHub Actions service principal used by azd/CI needs:
//     - "Contributor" on the resource group (to create/update resources)
//     - "User Access Administrator" on the resource group (to create role assignments)
//   OR a custom role combining both. Without "User Access Administrator", the role
//   assignment modules (storageAccess, keyVaultAccess) will fail at deploy time.
// =============================================================================

targetScope = 'resourceGroup'

@description('Primary location for all resources')
param location string = resourceGroup().location

@description('Environment name (dev, staging, prod)')
param environmentName string

@description('Enable network isolation with VNet, private endpoints, and disabled public access. Default false for dev.')
param enableNetworkIsolation bool = false

@description('Comma-separated list of allowed OAuth redirect hosts for production (e.g., your-app.azurestaticapps.net). Set via: azd env set ALLOWED_REDIRECT_HOSTS <host1,host2>')
param allowedRedirectHosts string = ''

@description('Unique suffix for resource names')
param resourceToken string = uniqueString(resourceGroup().id)

// Tags applied to all resources
var tags = {
  // azd-env-name requires quotes due to hyphens
  'azd-env-name': environmentName
  app: 'djai'
}

// Flex Consumption deployment container name (deterministic, unique per resource group)
var deploymentContainerName = 'app-package-${take('func-djai-${resourceToken}', 32)}-${take(uniqueString('func-djai', resourceGroup().id), 7)}'

// ---------------------------------------------------------------------------
// Networking — VNet, Private DNS Zones, Private Endpoints (network isolation only)
// All networking resources consolidated into one module to avoid BCP318 warnings.
// ---------------------------------------------------------------------------

module networkIsolation 'modules/network-isolation.bicep' = if (enableNetworkIsolation) {
  name: 'network-isolation'
  params: {
    resourceToken: resourceToken
    location: location
    tags: tags
    storageAccountId: storage.outputs.id
    keyVaultId: keyVault.outputs.id
    redisId: redis.outputs.id
  }
}

// ---------------------------------------------------------------------------
// Observability — Log Analytics, Application Insights
// ---------------------------------------------------------------------------

module logAnalytics 'modules/log-analytics.bicep' = {
  name: 'log-analytics'
  params: {
    name: 'log-${resourceToken}'
    location: location
    tags: tags
  }
}

module appInsights 'modules/app-insights.bicep' = {
  name: 'app-insights'
  params: {
    name: 'ai-${resourceToken}'
    location: location
    tags: tags
    logAnalyticsWorkspaceId: logAnalytics.outputs.id
  }
}

// ---------------------------------------------------------------------------
// Data — Storage, Redis, Key Vault (all with publicNetworkAccess: Disabled)
// ---------------------------------------------------------------------------

module storage 'modules/storage.bicep' = {
  name: 'storage'
  params: {
    name: 'st${resourceToken}'
    location: location
    tags: tags
    disablePublicAccess: enableNetworkIsolation
    deploymentContainerName: deploymentContainerName
  }
}

module redis 'modules/redis.bicep' = {
  name: 'redis'
  params: {
    name: 'redis-${resourceToken}'
    location: location
    tags: tags
    disablePublicAccess: enableNetworkIsolation
  }
}

module keyVault 'modules/key-vault.bicep' = {
  name: 'key-vault'
  params: {
    name: 'kv-${resourceToken}'
    location: location
    tags: tags
    disablePublicAccess: enableNetworkIsolation
  }
}

// ---------------------------------------------------------------------------
// Compute — Azure Functions (OAuth Proxy)
// ---------------------------------------------------------------------------

module functionApp 'modules/function-app.bicep' = {
  name: 'function-app'
  params: {
    name: 'func-djai-${resourceToken}'
    location: location
    tags: tags
    appInsightsConnectionString: appInsights.outputs.connectionString
    keyVaultUri: keyVault.outputs.uri
    redisConnectionString: redis.outputs.connectionString
    storageAccountName: storage.outputs.name
    deploymentContainerName: deploymentContainerName
    allowedRedirectHosts: allowedRedirectHosts
    allowedRedirectSchemes: 'djai'
    enableNetworkIsolation: enableNetworkIsolation
    // Safe: functionsSubnetId is only read when enableNetworkIsolation is true,
    // which is the same condition that deploys the networkIsolation module.
    #disable-next-line BCP318
    functionsSubnetId: enableNetworkIsolation ? networkIsolation.outputs.functionsSubnetId : ''
  }
}

// ---------------------------------------------------------------------------
// Role Assignments — MI permissions for all inter-resource connectivity
// ---------------------------------------------------------------------------

// Function App MI → Key Vault (Key Vault Secrets User)
module keyVaultAccess 'modules/key-vault-access.bicep' = {
  name: 'key-vault-access'
  params: {
    keyVaultName: keyVault.outputs.name
    principalId: functionApp.outputs.principalId
  }
}

// Function App MI → Storage (Blob Data Owner + Account Contributor + Queue Data Contributor)
module storageAccess 'modules/storage-access.bicep' = {
  name: 'storage-access'
  params: {
    storageAccountName: storage.outputs.name
    principalId: functionApp.outputs.principalId
  }
}

// ---------------------------------------------------------------------------
// Outputs for azd (no secrets — only resource names and URLs)
// ---------------------------------------------------------------------------

@description('Name of the deployed Function App')
output AZURE_FUNCTION_APP_NAME string = functionApp.outputs.name

@description('URL of the deployed Function App')
output AZURE_FUNCTION_APP_URL string = functionApp.outputs.url

@description('Name of the Key Vault')
output AZURE_KEY_VAULT_NAME string = keyVault.outputs.name

@description('Name of the Redis cache')
output AZURE_REDIS_NAME string = redis.outputs.name

@description('Name of the VNet (empty when network isolation is disabled)')
#disable-next-line BCP318
output AZURE_VNET_NAME string = enableNetworkIsolation ? networkIsolation.outputs.vnetName : ''
