using Newtonsoft.Json;
using System.Web;
using System.Web.Mvc;

namespace BladeManager
{
    public partial class Actions
    {
        public static RedirectResult Redirect(BladeSettings Settings = null)
        {
            HttpResponse Response = HttpContext.Current.Response;
            Response.StatusCode = 306;
            Response.Headers.Add("blade-settings", JsonConvert.SerializeObject(Settings ?? new BladeSettings(null),
                            Formatting.None,
                            new JsonSerializerSettings
                            {
                                NullValueHandling = NullValueHandling.Ignore
                            }));
            return null;
        }
    }
}