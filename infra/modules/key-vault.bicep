@description('Name of the Key Vault')
param name string

@description('Location for the Key Vault')
param location string

@description('Tags to apply to the Key Vault')
param tags object

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: name
  location: location
  tags: tags
  properties: {
    sku: { family: 'A', name: 'standard' }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
    enableSoftDelete: true
    enablePurgeProtection: true
    softDeleteRetentionInDays: 7
    publicNetworkAccess: 'disabled'
    networkAcls: {
      defaultAction: 'Deny'
      bypass: 'AzureServices'
    }
  }
}

@description('Name of the Key Vault')
output name string = keyVault.name

@description('URI of the Key Vault')
output uri string = keyVault.properties.vaultUri

@description('Resource ID of the Key Vault')
output id string = keyVault.id
