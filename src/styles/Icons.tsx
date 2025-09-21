import React from 'react';

export const ExpandRightIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18" >
    <path  d="M12,9a.994.994,0,0,1-.2925.7045l-3.9915,3.99a1,1,0,1,1-1.4355-1.386l.0245-.0245L9.5905,9,6.3045,5.715A1,1,0,0,1,7.691,4.28l.0245.0245,3.9915,3.99A.994.994,0,0,1,12,9Z" />
  </svg>
);

export const ExpandDownIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18" >
    <path  d="M4,7.01a1,1,0,0,1,1.7055-.7055l3.289,3.286,3.289-3.286a1,1,0,0,1,1.437,1.3865l-.0245.0245L9.7,11.7075a1,1,0,0,1-1.4125,0L4.293,7.716A.9945.9945,0,0,1,4,7.01Z" />
  </svg>
);

export const FolderClosedIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18" >
    <path  d="M16.5,4l-7.166.004-1.65-1.7A1,1,0,0,0,6.9645,2H2A1,1,0,0,0,1,3V14.5a.5.5,0,0,0,.5.5h15a.5.5,0,0,0,.5-.5V4.5A.5.5,0,0,0,16.5,4ZM2,3H6.9645L8.908,5H2Z" />
  </svg>
);

export const FolderOpenIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18" >
    <path  d="M15,7V4.5a.5.5,0,0,0-.5-.5l-6.166.004-1.65-1.7A1,1,0,0,0,5.9645,2H2A1,1,0,0,0,1,3V14.5a.5.5,0,0,0,.5.5H14.6535a.5.5,0,0,0,.468-.3245l2.625-7A.5.5,0,0,0,17.2785,7ZM2,3H5.9645L7.617,4.7l.295.3035h.4225L14,5V7H4.3465a.5.5,0,0,0-.468.3245L2,12.3335Z" />
  </svg>
);

export const ApplyIcon = ({ disabled }: { disabled?: boolean } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18" >
    <path className="icon-fill" fillOpacity={disabled ? 0.35 : 1} d="M15.656,3.8625l-.7275-.5665a.5.5,0,0,0-.7.0875L7.411,12.1415,4.0875,8.8355a.5.5,0,0,0-.707,0L2.718,9.5a.5.5,0,0,0,0,.707l4.463,4.45a.5.5,0,0,0,.75-.0465L15.7435,4.564A.5.5,0,0,0,15.656,3.8625Z" />
  </svg>
);

export const BackIcon = ({ disabled }: { disabled?: boolean } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18" >
    <path className="icon-fill" fillOpacity={disabled ? 0.35 : 1} d="M7.5145,5H7V2.4A.4.4,0,0,0,6.6,2H6.597a.39252.39252,0,0,0-.28.118L1.1035,7.732a.4.4,0,0,0,0,.536L6.317,13.882a.39252.39252,0,0,0,.28.118A.4.4,0,0,0,7,13.603V11a9.855,9.855,0,0,1,9.3955,3.405.335.335,0,0,0,.6045-.2C17,12.7265,15.366,5,7.5145,5Z" />
  </svg>
);

export const DeleteIcon = ({ disabled }: { disabled?: boolean } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18" >
    <path className="icon-fill" fillOpacity={disabled ? 0.35 : 1} d="M15.75,3H12V2a1,1,0,0,0-1-1H6A1,1,0,0,0,5,2V3H1.25A.25.25,0,0,0,1,3.25v.5A.25.25,0,0,0,1.25,4h1L3.4565,16.55a.5.5,0,0,0,.5.45H13.046a.5.5,0,0,0,.5-.45L14.75,4h1A.25.25,0,0,0,16,3.75v-.5A.25.25,0,0,0,15.75,3ZM5.5325,14.5a.5.5,0,0,1-.53245-.46529L5,14.034l-.5355-8a.50112.50112,0,0,1,1-.067l.5355,8a.5.5,0,0,1-.46486.53283ZM9,14a.5.5,0,0,1-1,0V6A.5.5,0,0,1,9,6ZM11,3H6V2h5Zm1,11.034a.50112.50112,0,0,1-1-.067l.5355-8a.50112.50112,0,1,1,1,.067Z" />
  </svg>
);

export const RecordIcon = ( { active, disabled }: { active: boolean, disabled?: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18" >
    <circle cx="9" cy="9" r="6" fill={active ? 'var(--danger, #e74c3c)' : 'currentColor'} className="icon-fill" fillOpacity={disabled ? 0.35 : 1} />
  </svg>
);

export const SnapshotIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18" >
    <rect x="3" y="5" width="12" height="8"  />
  </svg>
);

export const VisibilityOffIcon = ({ active }: { active?: boolean } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 0 18 18" width="18" >
    <path className="icon-fill" fill={active ? 'var(--warn, #f1c40f)' : 'currentColor'} d="M12.3065,4.29A7.48591,7.48591,0,0,0,9,3.4685c-4.332,0-7.875,4.3125-7.875,5.7115,0,1.5,3.729,5.35,7.843,5.35,4.15,0,7.907-3.853,7.907-5.35C16.875,8,14.768,5.5095,12.3065,4.29ZM3.5,3.5l11,11-.707.707-11-11z" />
  </svg>
);

export const VisibilityOnIcon = ({ active }: { active?: boolean } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 0 18 18" width="18" >
    <path className="icon-fill" fill={active ? 'var(--warn, #f1c40f)' : 'currentColor'} d="M12.3065,4.29A7.48591,7.48591,0,0,0,9,3.4685c-4.332,0-7.875,4.3125-7.875,5.7115,0,1.5,3.729,5.35,7.843,5.35,4.15,0,7.907-3.853,7.907-5.35C16.875,8,14.768,5.5095,12.3065,4.29ZM9,13.6125A4.6125,4.6125,0,1,1,13.6125,9,4.6125,4.6125,0,0,1,9,13.6125Z" />
    <path className="icon-fill" fill={active ? 'var(--warn, #f1c40f)' : 'currentColor'} d="M10.3335,9.0415A1.3335,1.3335,0,0,1,9,7.7085a1.316,1.316,0,0,1,.675-1.135A2.46964,2.46964,0,0,0,9,6.469a2.5315,2.5315,0,1,0,2.5315,2.5315V9a2.35682,2.35682,0,0,0-.0875-.6A1.3125,1.3125,0,0,1,10.3335,9.0415Z" />
  </svg>
);

export const LockClosedIcon = ({ active }: { active?: boolean } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 0 18 18" width="18" >
    <path className="icon-fill" fill={active ? 'var(--danger, #e74c3c)' : 'currentColor'} d="M14.5,8H14V7A5,5,0,0,0,4,7V8H3.5a.5.5,0,0,0-.5.5v8a.5.5,0,0,0,.5.5h11a.5.5,0,0,0,.5-.5v-8A.5.5,0,0,0,14.5,8ZM6,7a3,3,0,0,1,6,0V8H6Zm4,6.111V14.5a.5.5,0,0,1-.5.5h-1a.5.5,0,0,1-.5-.5V13.111a1.5,1.5,0,1,1,2,0Z" />
  </svg>
);

export const LockOpenIcon = ({ active }: { active?: boolean } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 0 18 18" width="18" >
    <path className="icon-fill" fill={active ? 'var(--danger, #e74c3c)' : 'currentColor'} d="M14.5,8H5.95V5.1765A3.1065,3.1065,0,0,1,8.9852,2.0003L9,2a3.0715,3.0715,0,0,1,2.754,1.7095c.155.3195.133.573.3885.573a.2541.2541,0,0,0,.093-.018L13.576,3.73a.25649.25649,0,0,0,.161-.2355A4.96,4.96,0,0,0,9,.05,5.16306,5.16306,0,0,0,4,5.146V8H3.5a.5.5,0,0,0-.5.5v8a.5.5,0,0,0,.5.5h11a.5.5,0,0,0,.5-.5v-8A.5.5,0,0,0,14.5,8ZM10,13.111V14.5a.5.5,0,0,1-.5.5h-1a.5.5,0,0,1-.5-.5V13.111a1.5,1.5,0,1,1,2,0Z" />
  </svg>
);

export const MoveLockIcon = ({ active }: { active?: boolean } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18" >
    <path className="icon-fill" fill={active ? 'var(--danger, #e74c3c)' : 'currentColor'} d="M17,9a.25.25,0,0,0-.0565-.158L16,8.0145V8h-.0165L14.927,7.0735A.245.245,0,0,0,14.75,7a.25.25,0,0,0-.25.25V8H10V3.5h.75A.25.25,0,0,0,11,3.25a.24448.24448,0,0,0-.0735-.175L10,2.0165V2H9.9855L9.158,1.0565a.25.25,0,0,0-.316,0L8.0145,2H8v.0165L7.0735,3.073A.24449.24449,0,0,0,7,3.25a.25.25,0,0,0,.25.25H8V8H3.5V7.25A.25.25,0,0,0,3.25,7a.245.245,0,0,0-.175.0735L2.0165,8H2v.0145l-.9435.8275a.25.25,0,0,0,0,.316L2,9.9855V10h.0165l1.0565.926A.24552.24552,0,0,0,3.25,11a.25.25,0,0,0,.25-.25V10H8v4.5H7.25a.25.25,0,0,0-.25.25.24352.24352,0,0,0,.0735.175L8,15.9835V16h.0145l.8275.9435a.25.25,0,0,0,.316,0L9.9855,16H10v-.0165l.9265-1.057A.24349.24349,0,0,0,11,14.75a.25.25,0,0,0-.25-.25H10V10h4.5v.75a.25.25,0,0,0,.25.25.24549.24549,0,0,0,.175-.074L15.9835,10H16V9.9855l.9435-.8275A.25.25,0,0,0,17,9Z" />
  </svg>
);

export const TransparencyLockIcon = ({ active }: { active?: boolean } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18" >
    <rect className="icon-fill" fill={active ? 'var(--danger, #e74c3c)' : 'currentColor'} width="3" height="3" x="6" y="6"  />
    <rect className="icon-fill" fill={active ? 'var(--danger, #e74c3c)' : 'currentColor'} width="3" height="3" x="9" y="9"  />
    <path className="icon-fill" fill={active ? 'var(--danger, #e74c3c)' : 'currentColor'} d="M15.5,2H2.5a.5.5,0,0,0-.5.5v13a.5.5,0,0,0,.5.5h13a.5.5,0,0,0,.5-.5V2.5A.5.5,0,0,0,15.5,2ZM15,6H12V9h3v3H12v3H9V12H6v3H3V12H6V9H3V6H6V3H9V5.99h3V3h3Z" />
  </svg>
);

export const BackgroundLockIcon = ({ active }: { active?: boolean } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 0 18 18" width="18" >
    <path className="icon-fill" fill={active ? 'var(--purple, #9b59b6)' : 'currentColor'} d="M14.5,8H14V7A5,5,0,0,0,4,7V8H3.5a.5.5,0,0,0-.5.5v8a.5.5,0,0,0,.5.5h11a.5.5,0,0,0,.5-.5v-8A.5.5,0,0,0,14.5,8ZM6,7a3,3,0,0,1,6,0V8H6Zm4,6.111V14.5a.5.5,0,0,1-.5.5h-1a.5.5,0,0,1-.5-.5V13.111a1.5,1.5,0,1,1,2,0Z" />
  </svg>
);

export const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18" aria-hidden="true" focusable="false">
    <path className="icon-fill" fill="currentColor" d="M13.2425,3.343,9,7.586,4.7575,3.343a.5.5,0,0,0-.707,0L3.343,4.05a.5.5,0,0,0,0,.707L7.586,9,3.343,13.2425a.5.5,0,0,0,0,.707l.707.7075a.5.5,0,0,0,.707,0L9,10.414l4.2425,4.243a.5.5,0,0,0,.707,0l.7075-.707a.5.5,0,0,0,0-.707L10.414,9l4.243-4.2425a.5.5,0,0,0,0-.707L13.95,3.343a.5.5,0,0,0-.70711-.00039Z" />
  </svg>
);

export const CheckmarkCircleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18" aria-hidden="true" focusable="false">
    <path className="icon-fill" fill="currentColor" d="M9,1a8,8,0,1,0,8,8A8,8,0,0,0,9,1Zm5.333,4.54L8.009,13.6705a.603.603,0,0,1-.4375.2305H7.535a.6.6,0,0,1-.4245-.1755L3.218,9.829a.6.6,0,0,1-.00147-.84853L3.218,8.979l.663-.6625A.6.6,0,0,1,4.72953,8.315L4.731,8.3165,7.4,10.991l5.257-6.7545a.6.6,0,0,1,.8419-.10586L13.5,4.1315l.7275.5685A.6.6,0,0,1,14.333,5.54Z" />
  </svg>
);

export const ErrorCircleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18" aria-hidden="true" focusable="false">
    <path className="icon-fill" fill="currentColor" d="M14.657,3.343a8,8,0,1,0-.00021,11.31371l.00021-.00021A8,8,0,0,0,14.657,3.343Zm-1.3435,9.265-.707.7055a.6.6,0,0,1-.84853.00147l-.00147-.00147L9,10.5555l-2.758,2.758a.6.6,0,0,1-.84853.00147L5.392,13.3135l-.7045-.7075a.6.6,0,0,1-.00147-.84853L4.6875,11.756,7.4445,9,4.6875,6.242A.6.6,0,0,1,4.686,5.39347L4.6875,5.392l.707-.707A.6.6,0,0,1,6.243,4.68353L6.2445,4.685,9,7.444l2.758-2.7575a.6.6,0,0,1,.84853-.00147l.00147.00147.707.707a.6.6,0,0,1,.00147.84853L13.315,6.2435,10.5555,9l2.758,2.758a.6.6,0,0,1,.00147.84853Z" />
  </svg>
);