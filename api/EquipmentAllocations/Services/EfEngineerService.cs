using EquipmentAllocations.Data;
using EquipmentAllocations.Dtos;
using EquipmentAllocations.Entities;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace EquipmentAllocations.Services
{
    public class EfEngineerService : IEngineerService
    {
        private readonly EquipmentAllocationsDbContext _db;

        public EfEngineerService(EquipmentAllocationsDbContext db)
        {
            _db = db;
        }

        public IEnumerable<EngineerDto> GetAll()
        {
            return _db.Engineers.AsNoTracking().Select(e => new EngineerDto
            {
                EngineerId = e.EngineerId,
                FullName = e.FullName,
                Office = e.Office,
                Email = e.Email,
                Notes = e.Notes
            }).ToList();
        }

        public EngineerDto Create(CreateEngineerDto dto)
        {
            var entity = new Engineer
            {
                FullName = dto.FullName,
                Office = dto.Office,
                Email = dto.Email,
                Notes = dto.Notes
            };

            _db.Engineers.Add(entity);
            _db.SaveChanges();

            return new EngineerDto
            {
                EngineerId = entity.EngineerId,
                FullName = entity.FullName,
                Office = entity.Office,
                Email = entity.Email,
                Notes = entity.Notes
            };
        }
    }
}
