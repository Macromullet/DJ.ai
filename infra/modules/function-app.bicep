param name string
param location string
param tags object
param appInsightsConnectionString string
param keyVaultUri string
param redisConnectionString string
param storageAccountConnectionString string
param allowedRedirectHosts string = ''
param allowedRedirectSchemes string = 'djai'

resource plan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: '${name}-plan'
  location: location
  tags: tags
  kind: 'elastic'
  sku: {
    name: 'EP1'
    tier: 'ElasticPremium'
  }
  properties: {
    reserved: true  // Linux
  }
}

resource functionApp 'Microsoft.Web/sites@2023-12-01' = {
  name: name
  location: location
  tags: union(tags, { 'azd-service-name': 'oauth-proxy' })
  kind: 'functionapp,linux'
  identity: { type: 'SystemAssigned' }
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'DOTNET-ISOLATED|8.0'
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      cors: {
        allowedOrigins: [
          'https://*.azurestaticapps.net'
        ]
      }
      appSettings: [
        { name: 'FUNCTIONS_WORKER_RUNTIME', value: 'dotnet-isolated' }
        { name: 'AzureWebJobsStorage', value: storageAccountConnectionString }
        { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: appInsightsConnectionString }
        { name: 'AZURE_FUNCTIONS_ENVIRONMENT', value: 'Production' }
        { name: 'KeyVaultUrl', value: keyVaultUri }
        { name: 'ConnectionStrings__cache', value: redisConnectionString }
        { name: 'ALLOWED_REDIRECT_HOSTS', value: allowedRedirectHosts }
        { name: 'ALLOWED_REDIRECT_SCHEMES', value: allowedRedirectSchemes }
      ]
    }
  }
}

output name string = functionApp.name
output url string = 'https://${functionApp.properties.defaultHostName}'
output principalId string = functionApp.identity.principalId
