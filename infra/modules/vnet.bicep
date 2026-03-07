@description('Name of the virtual network')
param name string

@description('Location for the virtual network')
param location string

@description('Tags to apply to the virtual network')
param tags object

@description('Address prefix for the VNet')
param addressPrefix string = '10.0.0.0/16'

@description('Address prefix for the functions integration subnet')
param functionsSubnetPrefix string = '10.0.1.0/24'

@description('Address prefix for the private endpoints subnet')
param privateEndpointsSubnetPrefix string = '10.0.2.0/24'

resource vnet 'Microsoft.Network/virtualNetworks@2023-11-01' = {
  name: name
  location: location
  tags: tags
  properties: {
    addressSpace: {
      addressPrefixes: [addressPrefix]
    }
    subnets: [
      {
        name: 'snet-functions'
        properties: {
          addressPrefix: functionsSubnetPrefix
          delegations: [
            {
              name: 'delegation-serverfarms'
              properties: {
                serviceName: 'Microsoft.Web/serverFarms'
              }
            }
          ]
        }
      }
      {
        name: 'snet-private-endpoints'
        properties: {
          addressPrefix: privateEndpointsSubnetPrefix
        }
      }
    ]
  }
}

@description('Resource ID of the virtual network')
output id string = vnet.id

@description('Name of the virtual network')
output name string = vnet.name

@description('Resource ID of the functions integration subnet')
output functionsSubnetId string = vnet.properties.subnets[0].id

@description('Resource ID of the private endpoints subnet')
output privateEndpointsSubnetId string = vnet.properties.subnets[1].id
