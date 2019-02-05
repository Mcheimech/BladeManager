namespace BladeManager
{
    public class BladeSettings
    {

        public BladeSettings(object Content)
        {
            content = Content;
        }

        public string title { get; set; }
        public bool oneInstance { get; set; } = true;
        public bool canClose { get; set; } = true;
        public bool fullWidth { get; set; }
        public bool propertiesBlade { get; set; }
        public string backColor { get; set; }
        public string headerBack { get; set; }
        public string contentBack { get; set; }
        public bool addToUrl { get; set; } = true;
        public object content { get; set; }
    }
}