using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Azure.Identity;
using Azure.Security.KeyVault.Secrets;
using DJai.OAuthProxy.Services;
using StackExchange.Redis;

var host = new HostBuilder()
    .AddServiceDefaults()
    .ConfigureFunctionsWebApplication()
    .ConfigureServices((context, services) =>
    {
        services.AddApplicationInsightsTelemetryWorkerService();
        services.ConfigureFunctionsApplicationInsights();
        services.AddMemoryCache();

        // Register Redis if a connection string is provided (via Aspire or config)
        var redisConnection = context.Configuration.GetConnectionString("cache");
        if (!string.IsNullOrEmpty(redisConnection))
        {
            services.AddSingleton<IConnectionMultiplexer>(
                ConnectionMultiplexer.Connect(redisConnection));
        }

        // Determine environment
        var environment = context.Configuration["AZURE_FUNCTIONS_ENVIRONMENT"];
        var useStubs = context.Configuration["USE_STUB_SECRETS"] == "true";
        var isLocal = environment == "Development";

        // Register Secret Service
        if (useStubs)
        {
            // Stub mode - for testing without real credentials
            Console.WriteLine("⚠️  Using STUB secrets (testing mode)");
            services.AddSingleton<ISecretService, StubSecretService>();
        }
        else if (isLocal)
        {
            // Local development - read from local.settings.json
            services.AddSingleton<ISecretService, LocalSecretService>();
        }
        else
        {
            // Production - Azure Key Vault
            var keyVaultUrl = context.Configuration["KeyVaultUrl"] 
                ?? throw new Exception("KeyVaultUrl not configured");
            
            var secretClient = new SecretClient(
                new Uri(keyVaultUrl),
                new DefaultAzureCredential()
            );
            
            services.AddSingleton(secretClient);
            services.AddSingleton<ISecretService, KeyVaultSecretService>();
        }

        // Register State Store Service (Redis-backed with in-memory fallback)
        services.AddSingleton<IStateStoreService, RedisStateStoreService>();

        // Register Device Auth Service (Redis-backed with in-memory fallback)
        services.AddSingleton<IDeviceAuthService, RedisDeviceAuthService>();
        
        // Register Validation Service
        services.AddSingleton<IValidationService, ValidationService>();
        
        // Register HttpClientFactory to prevent socket exhaustion
        services.AddHttpClient();
    })
    .Build();

host.Run();
