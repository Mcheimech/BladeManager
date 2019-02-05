using System;
using System.Collections.Generic;
using System.Collections.Specialized;
using System.Linq;

namespace BladeManager
{
    public static class NameCollectionExtension
    {
        public static Dictionary<string, string> ToDictionary(this NameValueCollection collection)
        {
            return collection
                .Cast<string>()
                .ToDictionary(key => key, key => collection[key]);
        }
    }
}