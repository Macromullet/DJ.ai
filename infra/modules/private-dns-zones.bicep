@description('Resource ID of the VNet to link DNS zones to')
param vnetId string

@description('Tags to apply to DNS zone resources')
param tags object

// Private DNS zone names are fixed Azure-defined FQDNs — they cannot use environment().
#disable-next-line no-hardcoded-env-urls
@description('All private DNS zone names required for private endpoint resolution')
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
      id: vnetId
    }
    registrationEnabled: false
  }
}]

@description('Resource ID of the privatelink.blob.core.windows.net DNS zone')
output blobDnsZoneId string = zones[0].id

@description('Resource ID of the privatelink.queue.core.windows.net DNS zone')
output queueDnsZoneId string = zones[1].id

@description('Resource ID of the privatelink.table.core.windows.net DNS zone')
output tableDnsZoneId string = zones[2].id

@description('Resource ID of the privatelink.vaultcore.azure.net DNS zone')
output keyVaultDnsZoneId string = zones[3].id

@description('Resource ID of the privatelink.redis.cache.windows.net DNS zone')
output redisDnsZoneId string = zones[4].id
