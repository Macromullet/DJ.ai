targetScope = 'resourceGroup'

@description('Primary location for all resources')
param location string = resourceGroup().location

@description('Environment name (dev, staging, prod)')
param environmentName string

@description('Comma-separated list of allowed OAuth redirect hosts for production. Set via: azd env set ALLOWED_REDIRECT_HOSTS host1,host2')
param allowedRedirectHosts string = ''

@description('Unique suffix for resource names')
param resourceToken string = uniqueString(resourceGroup().id)

// Tags applied to all resources
var tags = {
  // azd-env-name requires quotes due to hyphens
  'azd-env-name': environmentName
  app: 'djai'
}

// Log Analytics Workspace
module logAnalytics 'modules/log-analytics.bicep' = {
  name: 'log-analytics'
  params: {
    name: 'log-${resourceToken}'
    location: location
    tags: tags
  }
}

// Application Insights
module appInsights 'modules/app-insights.bicep' = {
  name: 'app-insights'
  params: {
    name: 'ai-${resourceToken}'
    location: location
    tags: tags
    logAnalyticsWorkspaceId: logAnalytics.outputs.id
  }
}

// Key Vault
module keyVault 'modules/key-vault.bicep' = {
  name: 'key-vault'
  params: {
    name: 'kv-${resourceToken}'
    location: location
    tags: tags
  }
}

// Redis Cache
module redis 'modules/redis.bicep' = {
  name: 'redis'
  params: {
    name: 'redis-${resourceToken}'
    location: location
    tags: tags
  }
}

// Storage Account (for Azure Functions)
module storage 'modules/storage.bicep' = {
  name: 'storage'
  params: {
    name: 'st${resourceToken}'
    location: location
    tags: tags
  }
}

// Azure Functions (OAuth Proxy)
module functionApp 'modules/function-app.bicep' = {
  name: 'function-app'
  params: {
    name: 'func-djai-${resourceToken}'
    location: location
    tags: tags
    appInsightsConnectionString: appInsights.outputs.connectionString
    keyVaultUri: keyVault.outputs.uri
    redisConnectionString: redis.outputs.connectionString
    storageAccountConnectionString: storage.outputs.connectionString
    allowedRedirectHosts: allowedRedirectHosts
    allowedRedirectSchemes: 'djai'
  }
}

// Grant Function App access to Key Vault secrets
module keyVaultAccess 'modules/key-vault-access.bicep' = {
  name: 'key-vault-access'
  params: {
    keyVaultName: keyVault.outputs.name
    principalId: functionApp.outputs.principalId
  }
}

// Outputs for azd
output AZURE_FUNCTION_APP_NAME string = functionApp.outputs.name
output AZURE_FUNCTION_APP_URL string = functionApp.outputs.url
output AZURE_KEY_VAULT_NAME string = keyVault.outputs.name
output AZURE_REDIS_NAME string = redis.outputs.name
