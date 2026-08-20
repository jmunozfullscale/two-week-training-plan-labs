using Microsoft.Extensions.DependencyInjection;

namespace EquipmentAllocations
{
    using Services;

    public static class ServiceCollectionExtensions
    {
        public static IServiceCollection AddEquipmentAllocationsServices(this IServiceCollection services)
        {
            // Singleton and in-memory stores only for PR1
            services.AddSingleton<IEngineerService, EngineerService>();
            services.AddSingleton<IDeviceService, DeviceService>();
            services.AddSingleton<IBookingService, BookingService>();

            return services;
        }
    }
}
