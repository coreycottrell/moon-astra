// Vite supplies the public mount path; Node-only rules tests default to root.
export const BASE_URL=import.meta.env?import.meta.env.BASE_URL:'/';
export const appPath=path=>BASE_URL+path.replace(/^\/+/, '');
