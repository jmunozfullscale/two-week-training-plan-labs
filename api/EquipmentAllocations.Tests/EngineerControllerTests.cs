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
            // Arrange (also now using a simple test stub for IEngineerService so the test doesn't depend on EF or in-memory storage)
            var service = new TestEngineerService();
            var controller = new EngineersController(service);
            controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() };

            // Simulate model validation error (missing email)
            controller.ModelState.AddModelError("Email", "Required");

            var dto = new CreateEngineerDto
            {
                FullName = "Test Engineer",
                Office = "HQ",
                Email = string.Empty
            };

            // Step 2 - Act
            var actionResult = controller.Post(dto);

            // Step 3 - Assert
            var objectResult = Assert.IsType<ObjectResult>(actionResult.Result);
            Assert.IsType<ValidationProblemDetails>(objectResult.Value);
        }
    }

    internal class TestEngineerService : IEngineerService
    {
        public EquipmentAllocations.Dtos.EngineerDto Create(EquipmentAllocations.Dtos.CreateEngineerDto dto)
        {
            return new EquipmentAllocations.Dtos.EngineerDto { EngineerId = 1, FullName = dto.FullName, Office = dto.Office, Email = dto.Email, Notes = dto.Notes };
        }

        public System.Collections.Generic.IEnumerable<EquipmentAllocations.Dtos.EngineerDto> GetAll()
        {
            return new EquipmentAllocations.Dtos.EngineerDto[0];
        }
    }
}
