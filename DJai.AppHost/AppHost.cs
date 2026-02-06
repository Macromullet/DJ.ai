var builder = DistributedApplication.CreateBuilder(args);

// Add Redis for distributed caching (OAuth state, device registry, rate limiting)
var redis = builder.AddRedis("cache")
    .WithRedisInsight();

// Read OAuth secrets from Aspire configuration (includes dotnet user-secrets)
var googleClientId = builder.Configuration["GoogleClientId"];
var googleClientSecret = builder.Configuration["GoogleClientSecret"];
var spotifyClientId = builder.Configuration["SpotifyClientId"];
var spotifyClientSecret = builder.Configuration["SpotifyClientSecret"];
var appleMusicTeamId = builder.Configuration["AppleMusicTeamId"];
var appleMusicKeyId = builder.Configuration["AppleMusicKeyId"];
var appleMusicPrivateKey = builder.Configuration["AppleMusicPrivateKey"];

// Add the OAuth proxy Azure Functions project
var oauthProxy = builder.AddAzureFunctionsProject<Projects.DJai_OAuthProxy>("oauth-proxy")
    .WithReference(redis)
    .WithExternalHttpEndpoints()
    .WithEnvironment("GoogleClientId", googleClientId)
    .WithEnvironment("GoogleClientSecret", googleClientSecret)
    .WithEnvironment("SpotifyClientId", spotifyClientId)
    .WithEnvironment("SpotifyClientSecret", spotifyClientSecret)
    .WithEnvironment("AppleMusicTeamId", appleMusicTeamId)
    .WithEnvironment("AppleMusicKeyId", appleMusicKeyId)
    .WithEnvironment("AppleMusicPrivateKey", appleMusicPrivateKey);

// Add the Electron app dev server (Vite + npm)
// AddViteApp already registers the http endpoint on port 5173 — no WithHttpEndpoint needed
builder.AddViteApp("electron-app", "../electron-app", "dev")
    .WithReference(oauthProxy)
    .WithEnvironment("VITE_OAUTH_PROXY_URL", ReferenceExpression.Create($"{oauthProxy.GetEndpoint("http")}/api"));

builder.Build().Run();
