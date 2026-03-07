@description('Name of the Function App')
param name string

@description('Location for the Function App')
param location string

@description('Tags to apply to the Function App')
param tags object

@description('Application Insights connection string for telemetry')
param appInsightsConnectionString string

@description('Key Vault URI for OAuth client secret retrieval')
param keyVaultUri string

@secure()
@description('Redis connection string (access-key based, routed over private endpoint)')
param redisConnectionString string

@description('Storage account name for MI-based AzureWebJobsStorage')
param storageAccountName string

@description('Comma-separated list of allowed OAuth redirect hosts')
param allowedRedirectHosts string = ''

@description('Allowed OAuth redirect URI schemes (e.g., djai)')
param allowedRedirectSchemes string = 'djai'

@description('Resource ID of the VNet subnet for Function App integration. Empty string disables VNet integration (required for Consumption plan).')
param functionsSubnetId string = ''

@description('Use premium plan with VNet integration. Set to false for Consumption (Y1) plan.')
param usePremiumPlan bool = false

resource plan 'Microsoft.Web/serverfarms@2024-04-01' = {
  name: '${name}-plan'
  location: location
  tags: tags
  kind: usePremiumPlan ? 'elastic' : 'functionapp'
  sku: usePremiumPlan ? { name: 'EP1', tier: 'ElasticPremium' } : { name: 'Y1', tier: 'Dynamic' }
  properties: {
    reserved: true // Linux
  }
}

resource functionApp 'Microsoft.Web/sites@2024-04-01' = {
  name: name
  location: location
  tags: union(tags, { 'azd-service-name': 'oauth-proxy' })
  kind: 'functionapp,linux'
  identity: { type: 'SystemAssigned' }
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    virtualNetworkSubnetId: usePremiumPlan ? functionsSubnetId : null
    siteConfig: {
      linuxFxVersion: 'DOTNET-ISOLATED|8.0'
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      http20Enabled: true
      remoteDebuggingEnabled: false
      detailedErrorLoggingEnabled: false
      vnetRouteAllEnabled: usePremiumPlan
      cors: {
        allowedOrigins: [
          'https://*.azurestaticapps.net'
        ]
      }
      appSettings: [
        { name: 'FUNCTIONS_WORKER_RUNTIME', value: 'dotnet-isolated' }
        { name: 'FUNCTIONS_EXTENSION_VERSION', value: '~4' }
        // MI-based storage — no shared key or connection string needed.
        // Requires Storage Blob Data Owner, Storage Account Contributor,
        // and Storage Queue Data Contributor roles on the storage account.
        { name: 'AzureWebJobsStorage__accountName', value: storageAccountName }
        { name: 'WEBSITE_RUN_FROM_PACKAGE', value: '1' }
        { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: appInsightsConnectionString }
        { name: 'AZURE_FUNCTIONS_ENVIRONMENT', value: 'Production' }
        { name: 'KeyVaultUrl', value: keyVaultUri }
        // Redis access-key connection string routed over private endpoint.
        // TODO: Migrate to MI-based Redis auth when Azure Functions Redis extension supports it.
        { name: 'ConnectionStrings__cache', value: redisConnectionString }
        { name: 'ALLOWED_REDIRECT_HOSTS', value: allowedRedirectHosts }
        { name: 'ALLOWED_REDIRECT_SCHEMES', value: allowedRedirectSchemes }
      ]
    }
  }
}

@description('Name of the Function App')
output name string = functionApp.name

@description('URL of the Function App')
output url string = 'https://${functionApp.properties.defaultHostName}'

@description('Principal ID of the Function App system-assigned managed identity')
output principalId string = functionApp.identity.principalId
