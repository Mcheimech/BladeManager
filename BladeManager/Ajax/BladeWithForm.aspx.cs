using System;
using System.Linq;
using BladeManager;

namespace BladeManager.Demo.Ajax
{
    public partial class BladeWithForm : System.Web.UI.Page
    {
        protected void Page_Load(object sender, EventArgs e)
        {
            Form.Action = Request.Url.AbsoluteUri;
            System.Web.HttpUtility.UrlDecode(new System.IO.StreamReader(Request.InputStream).ReadToEnd());
        }

        protected void btnSave_Click(object sender, EventArgs e)
        {
            //var postData = Newtonsoft.Json.JsonConvert.SerializeObject(Request.Form.ToDictionary());
            var postData = new System.Net.Http.FormUrlEncodedContent(Request.Form.ToDictionary());
            int seq = 1;
            if (!string.IsNullOrEmpty(Request.QueryString["seq"]))
                seq = int.Parse(Request.QueryString["seq"].ToString()) + 1;

            if (seq < 5)
            {
                WebFormsActions.Redirect(new BladeSettings(new BladeContent()
                {
                    url = "/Ajax/BladeWithForm.aspx?seq=" + seq.ToString(),
                    type = "Post",
                    //contentType = "application/json",
                    contentType = "application/x-www-form-urlencoded; charset=UTF-8",
                    data = postData.ReadAsStringAsync().Result
                })
                {
                    title = string.Format("Blade with form: #{0}", seq),
                    propertiesBlade = true
                });
            }
        }

        
    }
}