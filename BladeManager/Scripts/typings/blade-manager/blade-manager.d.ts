interface Blade {
    element: HTMLDivElement;
    settings: BladeSettings;
    index: number;
    name: string;
}

interface ToolbarButton {
    id?: string;
    text: string;
    icon?: string;
    classList?: string;
    enabled?: boolean;
    callback: Function;
}

interface BladeToolbar {
    buttons: Array<ToolbarButton>;
}

interface BladeContent {
    url: string;
    type?: string;
    data?: any;
    dataType?: any;
    contentType?: any;
}

interface BladeSettings {
    name?: string;
    title?: string;
    backColor?: string;
    headerBack?: string;
    contentBack?: string;
    content: BladeContent | String;

    oneInstance?: boolean;
    canClose?: boolean;
    fullWidth?: boolean;
    propertiesBlade?: boolean;
    addToUrl?: boolean;
    canRestore?: boolean;
    canRefresh?: boolean;
    updateParent?: boolean;

    variables?: object;
    toolbar?: BladeToolbar;

    formSuccessCallback?: Function
}