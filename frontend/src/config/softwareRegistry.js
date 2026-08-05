export const softwareRegistry = [
  {
    _id: "6a05aabae476f9f401ea550a",
    key: "hrms",
    name: "HRMS",
    description: "Human Resource Management System",
    routePath: "/software/hrms",
    clientsGetApi: "https://hrmsapi.ifloriana.com/api/clients",
    packagePostApi: "https://hrmsapi.ifloriana.com/api/packages",
    packagePutApi: "https://hrmsapi.ifloriana.com/api/packages/:id",
    packageDeleteApi: "https://hrmsapi.ifloriana.com/api/packages/:id",
    packageGetApi: "https://hrmsapi.ifloriana.com/api/packages",
    clientSignupApi: "https://hrmsapi.ifloriana.com/api/clients",
    clientToggleStatusApi: "https://hrmsapi.ifloriana.com/api/clients/:id/toggle-status",
    clientDeleteApi: "https://hrmsapi.ifloriana.com/api/clients/:id",
    clientSignupFields: [
      {
        fieldName: "ownerName",
        label: "Owner name",
        type: "text",
        required: true,
        options: [],
        placeholder: "Enter owner Name"
      },
      {
        fieldName: "businessName",
        label: "Business Name",
        type: "text",
        required: true,
        options: [],
        placeholder: "Enter business name"
      },
      {
        fieldName: "email",
        label: "Email",
        type: "email",
        required: true,
        options: [],
        placeholder: "Enter Email"
      },
      {
        fieldName: "phoneNumber",
        label: "Phone",
        type: "tel",
        required: true,
        options: [],
        placeholder: "Enter Mobile number"
      }
    ],
    isActive: true
  },
  {
    _id: "69e9ad48d83b23ac98ba2edb",
    key: "event-setu",
    name: "Event Setu",
    description: "Event Management Platform",
    routePath: "/software/event-setu",
    clientsGetApi: "https://appbackend.myeventsetu.com/api/eventsetu/admin",
    packagePostApi: "https://appbackend.myeventsetu.com/api/eventsetu/admin/packages",
    packagePutApi: "https://appbackend.myeventsetu.com/api/eventsetu/admin/packages/:id",
    packageDeleteApi: "https://appbackend.myeventsetu.com/api/eventsetu/admin/packages/:id",
    packageGetApi: "https://appbackend.myeventsetu.com/api/eventsetu/admin/packages",
    clientSignupApi: "https://appbackend.myeventsetu.com/api/eventsetu/admin/register",
    clientToggleStatusApi: "https://appbackend.myeventsetu.com/api/eventsetu/admin/:id/status",
    clientDeleteApi: "",
    clientSignupFields: [
      {
        fieldName: "ownerName",
        label: "Full Name",
        type: "text",
        required: true,
        options: [],
        placeholder: "Enter Your Full Name"
      },
      {
        fieldName: "businessName",
        label: "Business Name",
        type: "text",
        required: true,
        options: [],
        placeholder: "Enter Your Business Name"
      },
      {
        fieldName: "email",
        label: "Email",
        type: "email",
        required: true,
        options: [],
        placeholder: "Enter Your Email"
      },
      {
        fieldName: "phoneNumber",
        label: "Mobile Number",
        type: "tel",
        required: true,
        options: [],
        placeholder: "Enter your mobile number"
      }
    ],
    isActive: true
  }
];
