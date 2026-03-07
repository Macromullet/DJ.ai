@description('Name of the storage account to grant access to')
param storageAccountName string

@description('Principal ID of the managed identity to grant access')
param principalId string

// Storage Blob Data Owner - required for Azure Functions to read/write blob triggers and bindings
var storageBlobDataOwner = 'ba92f5b4-2d11-453d-a403-e96b0029c9fe'

// Storage Account Contributor - required for Azure Functions runtime to manage the storage account
var storageAccountContributor = '17d1049b-9a84-46fb-8f53-869881c3d3ab'

// Storage Queue Data Contributor - required for Azure Functions internal queue-based coordination
var storageQueueDataContributor = '974c5e8b-45b9-4653-ba55-5f855dd0fb88'

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' existing = {
  name: storageAccountName
}

@description('Grants Storage Blob Data Owner role to the managed identity')
resource blobDataOwnerRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storage.id, principalId, storageBlobDataOwner)
  scope: storage
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', storageBlobDataOwner)
    principalId: principalId
    principalType: 'ServicePrincipal'
  }
}

@description('Grants Storage Account Contributor role to the managed identity')
resource accountContributorRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storage.id, principalId, storageAccountContributor)
  scope: storage
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', storageAccountContributor)
    principalId: principalId
    principalType: 'ServicePrincipal'
  }
}

@description('Grants Storage Queue Data Contributor role to the managed identity')
resource queueDataContributorRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storage.id, principalId, storageQueueDataContributor)
  scope: storage
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', storageQueueDataContributor)
    principalId: principalId
    principalType: 'ServicePrincipal'
  }
}
