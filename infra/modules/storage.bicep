@description('Name of the storage account')
param name string

@description('Location for the storage account')
param location string

@description('Tags to apply to the storage account')
param tags object

@description('Disable public network access (requires private endpoints)')
param disablePublicAccess bool = false

@description('Name of the blob container for Flex Consumption deployment packages. Empty string skips creation.')
param deploymentContainerName string = ''

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: name
  location: location
  tags: tags
  kind: 'StorageV2'
  sku: { name: 'Standard_LRS' }
  properties: {
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
    allowSharedKeyAccess: false
    allowBlobPublicAccess: false
    publicNetworkAccess: disablePublicAccess ? 'Disabled' : 'Enabled'
    networkAcls: {
      defaultAction: disablePublicAccess ? 'Deny' : 'Allow'
      bypass: 'AzureServices'
    }
  }
}

// Deployment blob container for Flex Consumption (pre-created so the function app can deploy to it)
resource blobServices 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = if (deploymentContainerName != '') {
  parent: storage
  name: 'default'
}

resource deploymentContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = if (deploymentContainerName != '') {
  parent: blobServices
  name: deploymentContainerName
  properties: {
    publicAccess: 'None'
  }
}

@description('Name of the storage account')
output name string = storage.name

@description('Resource ID of the storage account')
output id string = storage.id
