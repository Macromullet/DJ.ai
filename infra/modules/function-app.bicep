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

@description('Name of the blob container for Flex Consumption deployment packages')
param deploymentContainerName string = ''

@description('Comma-separated list of allowed OAuth redirect hosts')
param allowedRedirectHosts string = ''

@description('Allowed OAuth redirect URI schemes (e.g., djai)')
param allowedRedirectSchemes string = 'djai'

@description('Resource ID of the VNet subnet for Function App integration. Empty disables VNet integration.')
param functionsSubnetId string = ''

@description('Enable network isolation with VNet integration, private endpoints, and disabled public access.')
param enableNetworkIsolation bool = false

// Storage endpoints for MI-based access
var storageBlobEndpoint = 'https://${storageAccountName}.blob.${environment().suffixes.storage}'

// Common app settings shared between both configurations
var commonAppSettings = [
  { name: 'AzureWebJobsStorage__accountName', value: storageAccountName }
  { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: appInsightsConnectionString }
  { name: 'AZURE_FUNCTIONS_ENVIRONMENT', value: 'Production' }
  { name: 'KeyVaultUrl', value: keyVaultUri }
  { name: 'ConnectionStrings__cache', value: redisConnectionString }
  { name: 'ALLOWED_REDIRECT_HOSTS', value: allowedRedirectHosts }
  { name: 'ALLOWED_REDIRECT_SCHEMES', value: allowedRedirectSchemes }
]

resource plan 'Microsoft.Web/serverfarms@2024-04-01' = {
  name: '${name}-plan'
  location: location
  tags: tags
  kind: 'functionapp'
  sku: { name: 'FC1', tier: 'FlexConsumption' }
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
    virtualNetworkSubnetId: enableNetworkIsolation ? functionsSubnetId : null
    // Flex Consumption uses functionAppConfig for deployment, scaling, and runtime.
    functionAppConfig: {
      deployment: {
        storage: {
          type: 'blobContainer'
          value: '${storageBlobEndpoint}/${deploymentContainerName}'
          authentication: {
            type: 'SystemAssignedIdentity'
          }
        }
      }
      scaleAndConcurrency: {
        maximumInstanceCount: 10
        instanceMemoryMB: 2048
      }
      runtime: {
        name: 'dotnet-isolated'
        version: '8.0'
      }
    }
    siteConfig: {
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      http20Enabled: true
      remoteDebuggingEnabled: false
      detailedErrorLoggingEnabled: false
      vnetRouteAllEnabled: enableNetworkIsolation
      cors: {
        allowedOrigins: union(
          [
            'http://localhost:5173'
            'http://localhost:5174'
            'http://localhost:5175'
          ],
          empty(allowedRedirectHosts) ? [] : map(
            filter(split(allowedRedirectHosts, ','), host => !startsWith(host, 'localhost')),
            host => 'https://${host}'
          )
        )
      }
      appSettings: commonAppSettings
    }
  }
}

@description('Name of the Function App')
output name string = functionApp.name

@description('URL of the Function App')
output url string = 'https://${functionApp.properties.defaultHostName}'

@description('Principal ID of the Function App system-assigned managed identity')
output principalId string = functionApp.identity.principalId
