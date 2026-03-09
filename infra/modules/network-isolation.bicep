// =============================================================================
// Network Isolation — VNet, Private DNS Zones, Private Endpoints
// =============================================================================
// Consolidates all networking resources into a single module to avoid BCP318
// warnings from cross-referencing conditional modules in main.bicep.
// =============================================================================

@description('Unique resource token for naming')
param resourceToken string

@description('Location for all networking resources')
param location string

@description('Tags to apply to all resources')
param tags object

@description('Resource ID of the storage account for private endpoints')
param storageAccountId string

@description('Resource ID of the Key Vault for private endpoints')
param keyVaultId string

@description('Resource ID of the Redis cache for private endpoints')
param redisId string

// ---------------------------------------------------------------------------
// VNet with two subnets: functions integration + private endpoints
// ---------------------------------------------------------------------------

resource vnet 'Microsoft.Network/virtualNetworks@2023-11-01' = {
  name: 'vnet-${resourceToken}'
  location: location
  tags: tags
  properties: {
    addressSpace: {
      addressPrefixes: ['10.0.0.0/16']
    }
    subnets: [
      {
        name: 'snet-functions'
        properties: {
          addressPrefix: '10.0.1.0/24'
          delegations: [
            {
              name: 'delegation-app-environments'
              properties: {
                serviceName: 'Microsoft.App/environments'
              }
            }
          ]
        }
      }
      {
        name: 'snet-private-endpoints'
        properties: {
          addressPrefix: '10.0.2.0/24'
        }
      }
    ]
  }
}

var peSubnetId = vnet.properties.subnets[1].id

// ---------------------------------------------------------------------------
// Private DNS Zones (Azure-defined FQDNs, linked to VNet)
// ---------------------------------------------------------------------------

// Private DNS zone names are fixed Azure-defined FQDNs — they cannot use environment().
#disable-next-line no-hardcoded-env-urls
var dnsZoneNames = [
  #disable-next-line no-hardcoded-env-urls
  'privatelink.blob.core.windows.net'
  #disable-next-line no-hardcoded-env-urls
  'privatelink.queue.core.windows.net'
  #disable-next-line no-hardcoded-env-urls
  'privatelink.table.core.windows.net'
  'privatelink.vaultcore.azure.net'
  'privatelink.redis.cache.windows.net'
]

resource zones 'Microsoft.Network/privateDnsZones@2020-06-01' = [for zone in dnsZoneNames: {
  name: zone
  location: 'global'
  tags: tags
}]

resource vnetLinks 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2020-06-01' = [for (zone, i) in dnsZoneNames: {
  parent: zones[i]
  name: 'link-${uniqueString(zone)}'
  location: 'global'
  tags: tags
  properties: {
    virtualNetwork: {
      id: vnet.id
    }
    registrationEnabled: false
  }
}]

// ---------------------------------------------------------------------------
// Private Endpoints — Storage (blob, queue, table), Key Vault, Redis
// ---------------------------------------------------------------------------

var endpoints = [
  { name: 'pe-stblob-${resourceToken}', serviceId: storageAccountId, group: 'blob', dnsIdx: 0 }
  { name: 'pe-stqueue-${resourceToken}', serviceId: storageAccountId, group: 'queue', dnsIdx: 1 }
  { name: 'pe-sttable-${resourceToken}', serviceId: storageAccountId, group: 'table', dnsIdx: 2 }
  { name: 'pe-kv-${resourceToken}', serviceId: keyVaultId, group: 'vault', dnsIdx: 3 }
  { name: 'pe-redis-${resourceToken}', serviceId: redisId, group: 'redisCache', dnsIdx: 4 }
]

resource privateEndpoints 'Microsoft.Network/privateEndpoints@2023-11-01' = [for ep in endpoints: {
  name: ep.name
  location: location
  tags: tags
  properties: {
    subnet: {
      id: peSubnetId
    }
    privateLinkServiceConnections: [
      {
        name: ep.name
        properties: {
          privateLinkServiceId: ep.serviceId
          groupIds: [ep.group]
        }
      }
    ]
  }
}]

resource dnsZoneGroups 'Microsoft.Network/privateEndpoints/privateDnsZoneGroups@2023-11-01' = [for (ep, i) in endpoints: {
  parent: privateEndpoints[i]
  name: 'default'
  properties: {
    privateDnsZoneConfigs: [
      {
        name: 'config'
        properties: {
          privateDnsZoneId: zones[ep.dnsIdx].id
        }
      }
    ]
  }
}]

// ---------------------------------------------------------------------------
// Outputs
// ---------------------------------------------------------------------------

@description('Resource ID of the functions integration subnet')
output functionsSubnetId string = vnet.properties.subnets[0].id

@description('Name of the virtual network')
output vnetName string = vnet.name
