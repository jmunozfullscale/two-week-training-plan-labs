using Microsoft.Extensions.DependencyInjection;

namespace EquipmentAllocations
{
    using Services;

    public static class ServiceCollectionExtensions
    {
        public static IServiceCollection AddEquipmentAllocationsServices(this IServiceCollection services)
        {
            // Register EF services as scoped (might go transactional on these services as well)
            services.AddScoped<IEngineerService, EfEngineerService>();
            services.AddScoped<IDeviceService, EfDeviceService>();
            services.AddScoped<IBookingService, EfBookingService>();

            // Transactional EF service registered as scoped
            services.AddScoped<IBookingTransactionalService, EfBookingTransactionalService>();

            return services;
        }
    }
}
