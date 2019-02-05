using System.Web.Mvc;

namespace BladeManager.Filters
{
    public class BladeManagerFilterAttribute : ActionFilterAttribute, IActionFilter
    {
        private readonly bool enabled;
        private readonly string redirectToController;
        private readonly string redirectToAction;

        public BladeManagerFilterAttribute(bool Enabled = true, string RedirectToController = null, string RedirectToAction = null)
        {
            enabled = Enabled;
            redirectToController = RedirectToController;
            redirectToAction = RedirectToAction;
        }

        void IActionFilter.OnActionExecuted(ActionExecutedContext filterContext)
        {
            if (!enabled)
            {
                this.OnActionExecuted(filterContext);
                return;
            }

            if (!(bool)filterContext.Controller.ViewData["IsBladeManager"])
            {
                filterContext.Result = new RedirectToRouteResult(
                    new System.Web.Routing.RouteValueDictionary(new
                    {
                        action = redirectToAction ?? "Index",
                        controller = redirectToController ?? filterContext.ActionDescriptor.ControllerDescriptor.ControllerName
                    })
                );
            }

            this.OnActionExecuted(filterContext);
        }

        void IActionFilter.OnActionExecuting(ActionExecutingContext filterContext)
        {
            string caller = filterContext.HttpContext.Request.Headers["x-custom-caller"];
            if (caller != null && caller == "blade-manager")
                filterContext.Controller.ViewData.Add("IsBladeManager", true);
            else
                filterContext.Controller.ViewData.Add("IsBladeManager", false);

            this.OnActionExecuting(filterContext);
        }
    }
}
