using System.Collections.Generic;
using EquipmentAllocations.Dtos;
using EquipmentAllocations.Services;
using Microsoft.AspNetCore.Mvc;

namespace EquipmentAllocations.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Route("api/employees")]
    public class EngineersController : ControllerBase
    {
        private readonly IEngineerService _service;

        public EngineersController(IEngineerService service)
        {
            _service = service;
        }

        [HttpGet]
        public ActionResult<IEnumerable<EngineerDto>> GetAll()
        {
            return Ok(_service.GetAll());
        }

        [HttpPost]
        public ActionResult<EngineerDto> Post([FromBody] CreateEngineerDto dto)
        {
            var created = _service.Create(dto);
            return CreatedAtAction(nameof(GetAll), new { id = created.EngineerId }, created);
        }

        [HttpPut("{id}")]
        public ActionResult<EngineerDto> Put(int id, [FromBody] UpdateEngineerDto dto)
        {
            try
            {
                var updated = _service.Update(id, dto);
                return Ok(updated);
            }
            catch (System.Collections.Generic.KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        public ActionResult Delete(int id)
        {
            var success = _service.Delete(id);
            if (!success) return NotFound();
            return NoContent();
        }
    }
}
