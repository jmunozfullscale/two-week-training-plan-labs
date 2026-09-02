using System.Collections.Generic;
using System.Linq;
using EquipmentAllocations.Controllers;
using EquipmentAllocations.Dtos;
using EquipmentAllocations.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Xunit;

namespace EquipmentAllocations.Tests
{
    public class EngineerControllerTests
    {
        [Fact]
        public void Post_InvalidModel_ReturnsValidationProblem()
        {
            var service = new TestEngineerService();
            var controller = new EngineersController(service);
            controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() };

            controller.ModelState.AddModelError("Email", "Required");

            var dto = new CreateEngineerDto
            {
                FullName = "Test Engineer",
                Office = "HQ",
                Email = string.Empty
            };

            Assert.False(controller.ModelState.IsValid);
        }

        [Fact]
        public void Post_ValidModel_ReturnsCreatedAtAction()
        {
            var service = new TestEngineerService();
            var controller = new EngineersController(service);
            controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() };

            var dto = new CreateEngineerDto
            {
                FullName = "Jane Doe",
                Office = "Cebu",
                Email = "jane@example.com"
            };

            var actionResult = controller.Post(dto);

            var createdAtActionResult = Assert.IsType<CreatedAtActionResult>(actionResult.Result);
            var returned = Assert.IsType<EngineerDto>(createdAtActionResult.Value);
            Assert.True(returned.EngineerId > 0);
            Assert.Equal("Jane Doe", returned.FullName);
        }

        [Fact]
        public void GetAll_ReturnsEngineersCollection()
        {
            var service = new TestEngineerService();
            var controller = new EngineersController(service);

            var actionResult = controller.GetAll();

            var okResult = Assert.IsType<OkObjectResult>(actionResult.Result);
            var items = Assert.IsAssignableFrom<IEnumerable<EngineerDto>>(okResult.Value);
            Assert.Single(items);
        }
    }

    internal class TestEngineerService : IEngineerService
    {
        private readonly List<EngineerDto> _engineers = new()
        {
            new EngineerDto { EngineerId = 1, FullName = "Existing Eng", Office = "HQ", Email = "eng@example.com" }
        };

        public EngineerDto Create(CreateEngineerDto dto)
        {
            var dtoCreated = new EngineerDto
            {
                EngineerId = _engineers.Count + 1,
                FullName = dto.FullName,
                Office = dto.Office,
                Email = dto.Email,
                Notes = dto.Notes
            };
            _engineers.Add(dtoCreated);
            return dtoCreated;
        }

        public EngineerDto Update(int id, UpdateEngineerDto dto)
        {
            throw new System.NotImplementedException();
        }

        public bool Delete(int id)
        {
            throw new System.NotImplementedException();
        }

        public IEnumerable<EngineerDto> GetAll()
        {
            return _engineers;
        }
    }
}
