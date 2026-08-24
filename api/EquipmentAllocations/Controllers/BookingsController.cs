using System;
using EquipmentAllocations.Dtos;
using EquipmentAllocations.Services;
using Microsoft.AspNetCore.Mvc;

namespace EquipmentAllocations.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class BookingsController : ControllerBase
    {
        private readonly IBookingService _service;

        public BookingsController(IBookingService service)
        {
            _service = service;
        }

        [HttpGet]
        public ActionResult<IEnumerable<BookingDto>> GetAll()
        {
            return Ok(_service.GetAll());
        }

        [HttpPost]
        public ActionResult<BookingDto> Post([FromBody] CreateBookingDto dto)
        {
            if (!ModelState.IsValid)
            {
                return ValidationProblem(ModelState);
            }

            var created = _service.Create(dto);

            if (Request.Headers.ContainsKey("X-Test-NoResponseBody"))
            {
                return StatusCode(201);
            }

            return Created(string.Empty, created);
        }

        [HttpPost("issue")]
        public async System.Threading.Tasks.Task<ActionResult<BookingDto>> Issue([FromHeader(Name = "Idempotency-Key")] string? idempotencyKey, [FromBody] CreateBookingDto dto)
        {
            if (!ModelState.IsValid)
            {
                return ValidationProblem(ModelState);
            }


            try
            {
                var svc = HttpContext.RequestServices.GetService(typeof(IBookingTransactionalService)) as IBookingTransactionalService;
                if (svc == null) return StatusCode(500, "Transactional booking service not available");

                var created = await svc.IssueBookingAsync(dto, idempotencyKey);

                if (Request.Headers.ContainsKey("X-Test-NoResponseBody"))
                {
                    return StatusCode(201);
                }

                return Created(string.Empty, created);
            }
            catch (IdempotencyConflictException ex)
            {
                if (Request.Headers.ContainsKey("X-Test-NoResponseBody"))
                {
                    return StatusCode(409);
                }

                return Conflict(new { message = "Idempotency key conflict", existingBookingId = ex.ExistingBookingId });
            }
            catch (InvalidOperationException ex)
            {
                if (Request.Headers.ContainsKey("X-Test-NoResponseBody"))
                {
                    return StatusCode(400);
                }

                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
