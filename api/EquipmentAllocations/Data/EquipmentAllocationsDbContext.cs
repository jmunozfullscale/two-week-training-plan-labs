using EquipmentAllocations.Entities;
using Microsoft.EntityFrameworkCore;

namespace EquipmentAllocations.Data
{
    public class EquipmentAllocationsDbContext : DbContext
    {
        public EquipmentAllocationsDbContext(DbContextOptions<EquipmentAllocationsDbContext> options)
            : base(options)
        {
        }

        public DbSet<Engineer> Engineers => Set<Engineer>();
        public DbSet<Device> Devices => Set<Device>();
        public DbSet<Booking> Bookings => Set<Booking>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Engineer>(eb =>
            {
                eb.HasKey(e => e.EngineerId);
                eb.Property(e => e.FullName).HasMaxLength(120).IsRequired();
                eb.Property(e => e.Office).HasMaxLength(60).IsRequired();
                eb.Property(e => e.Email).HasMaxLength(200).IsRequired();
            });

            modelBuilder.Entity<Device>(db =>
            {
                db.HasKey(d => d.DeviceId);
                db.Property(d => d.AssetTag).HasMaxLength(20).IsRequired();
                db.Property(d => d.Kind).HasMaxLength(40).IsRequired();
                db.Property(d => d.Status).HasMaxLength(20).IsRequired();
            });

            modelBuilder.Entity<Booking>(bb =>
            {
                bb.HasKey(b => b.BookingId);
                bb.Property(b => b.Status).HasMaxLength(20).IsRequired();
                bb.Property(b => b.IdempotencyKey).HasMaxLength(200);
                bb.HasIndex(b => b.IdempotencyKey).IsUnique();
                bb.HasOne(b => b.Device).WithMany().HasForeignKey(b => b.DeviceId).OnDelete(DeleteBehavior.Cascade);
                bb.HasOne(b => b.Engineer).WithMany().HasForeignKey(b => b.EngineerId).OnDelete(DeleteBehavior.Cascade);
            });
        }
    }
}
