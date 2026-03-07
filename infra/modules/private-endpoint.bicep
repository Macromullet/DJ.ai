@description('Name of the private endpoint')
param name string

@description('Location for the private endpoint')
param location string

@description('Tags to apply to the private endpoint')
param tags object

@description('Resource ID of the subnet for the private endpoint')
param subnetId string

@description('Resource ID of the target resource to connect to')
param privateLinkServiceId string

@description('Group ID(s) for the private endpoint (e.g., blob, vault, redisCache)')
param groupIds array

@description('Resource ID of the private DNS zone for automatic DNS registration')
param privateDnsZoneId string

resource privateEndpoint 'Microsoft.Network/privateEndpoints@2023-11-01' = {
  name: name
  location: location
  tags: tags
  properties: {
    subnet: {
      id: subnetId
    }
    privateLinkServiceConnections: [
      {
        name: name
        properties: {
          privateLinkServiceId: privateLinkServiceId
          groupIds: groupIds
        }
      }
    ]
  }
}

resource dnsZoneGroup 'Microsoft.Network/privateEndpoints/privateDnsZoneGroups@2023-11-01' = {
  parent: privateEndpoint
  name: 'default'
  properties: {
    privateDnsZoneConfigs: [
      {
        name: 'config'
        properties: {
          privateDnsZoneId: privateDnsZoneId
        }
      }
    ]
  }
}

@description('Resource ID of the private endpoint')
output id string = privateEndpoint.id
