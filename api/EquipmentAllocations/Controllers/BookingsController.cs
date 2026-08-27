using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Threading.Tasks;
using EquipmentAllocations.Dtos;
using EquipmentAllocations.Services;
using Microsoft.AspNetCore.Mvc;

namespace EquipmentAllocations.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Route("api/allocations")]
    public class BookingsController : ControllerBase
    {
        private readonly IBookingService _service;
        private readonly IBookingTransactionalService _transactionalService;

        public BookingsController(IBookingService service, IBookingTransactionalService transactionalService)
        {
            _service = service;
            _transactionalService = transactionalService;
        }

        [HttpGet]
        public ActionResult<IEnumerable<BookingDto>> GetAll()
        {
            return Ok(_service.GetAll());
        }

        [HttpPost]
        public ActionResult<BookingDto> Post([FromBody] CreateBookingDto dto)
        {
            var created = _service.Create(dto);
            return CreatedAtAction(nameof(GetAll), new { id = created.BookingId }, created);
        }

        [HttpPost("issue")]
        public async Task<ActionResult<BookingDto>> Issue(
            [FromHeader(Name = "Idempotency-Key")] string? idempotencyKey,
            [FromBody] CreateBookingDto dto)
        {
            if (string.IsNullOrWhiteSpace(idempotencyKey))
            {
                return BadRequest(new { message = "Idempotency-Key header is required" });
            }

            try
            {
                var created = await _transactionalService.IssueBookingAsync(dto, idempotencyKey);
                return CreatedAtAction(nameof(GetAll), new { id = created.BookingId }, created);
            }
            catch (IdempotencyConflictException ex)
            {
                return Conflict(new { message = "Idempotency key conflict", existingBookingId = ex.ExistingBookingId });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
