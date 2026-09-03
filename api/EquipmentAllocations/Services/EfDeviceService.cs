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

        public DeviceDto Create(CreateDeviceDto dto)
        {
            var entity = new Device
            {
                AssetTag = dto.AssetTag,
                Kind = dto.Kind,
                Status = dto.Status,
                PurchasedOn = dto.PurchasedOn,
                Notes = dto.Notes
            };

            _db.Devices.Add(entity);
            _db.SaveChanges();

            return new DeviceDto
            {
                DeviceId = entity.DeviceId,
                AssetTag = entity.AssetTag,
                Kind = entity.Kind,
                Status = entity.Status,
                PurchasedOn = entity.PurchasedOn,
                Notes = entity.Notes
            };
        }

        public DeviceDto Update(int id, UpdateDeviceDto dto)
        {
            var entity = _db.Devices.Find(id);
            if (entity == null) throw new System.Collections.Generic.KeyNotFoundException($"Device {id} not found");

            entity.AssetTag = dto.AssetTag;
            entity.Kind = dto.Kind;
            entity.Status = dto.Status;
            entity.PurchasedOn = dto.PurchasedOn;
            entity.Notes = dto.Notes;

            _db.SaveChanges();

            return new DeviceDto
            {
                DeviceId = entity.DeviceId,
                AssetTag = entity.AssetTag,
                Kind = entity.Kind,
                Status = entity.Status,
                PurchasedOn = entity.PurchasedOn,
                Notes = entity.Notes
            };
        }

        public bool Delete(int id)
        {
            var entity = _db.Devices.Find(id);
            if (entity == null) return false;

            _db.Devices.Remove(entity);
            _db.SaveChanges();
            return true;
        }
    }
}
