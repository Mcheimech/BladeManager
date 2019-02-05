using Newtonsoft.Json;
using System.Web;

namespace BladeManager
{
    public class WebFormsActions
    {
        public static void Redirect(BladeSettings Settings = null)
        {
            HttpResponse Response = HttpContext.Current.Response;
            Response.StatusCode = 306;
            Response.Headers.Add("blade-settings", JsonConvert.SerializeObject(Settings ?? new BladeSettings(null),
                            Formatting.None,
                            new JsonSerializerSettings
                            {
                                NullValueHandling = NullValueHandling.Ignore
                            }));
        }
    }
}
