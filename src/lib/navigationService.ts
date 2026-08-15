let navigator: ((path: string) => void) | null = null;

export const setGlobalNavigator = (nav: (path: string) => void) => {
  navigator = nav;
};

export const globalNavigate = (path: string) => {
  if (navigator) {
    navigator(path);
  } else {
    window.location.pathname = path;
  }
};