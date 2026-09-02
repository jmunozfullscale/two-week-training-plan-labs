using EquipmentAllocations.Data;
using EquipmentAllocations.Dtos;
using EquipmentAllocations.Entities;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;

namespace EquipmentAllocations.Services
{
    public class EfDeviceService : IDeviceService
    {
        private readonly EquipmentAllocationsDbContext _db;

        public EfDeviceService(EquipmentAllocationsDbContext db)
        {
            _db = db;
        }

        public IEnumerable<DeviceDto> GetAll()
        {
            return _db.Devices.AsNoTracking().Select(d => new DeviceDto
            {
                DeviceId = d.DeviceId,
                AssetTag = d.AssetTag,
                Kind = d.Kind,
                Status = d.Status,
                PurchasedOn = d.PurchasedOn,
                Notes = d.Notes
            }).ToList();
        }

    }
}
