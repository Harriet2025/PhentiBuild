import { request } from '../client'
import { endpoints } from '../endpoints'
import { legacyRole, type CurrentUser } from './auth'

export type CompanyProfile = {
  id: number
  companyName: string
  address: string
  phone: string
  email: string
  registrationNumber: string
}

export const accountApi = {
  /** Name, contact details and profession. Access level (Admin) can never be changed here. */
  updateProfile: (data: { name: string; email: string; phone: string; profession: string }) =>
    request<CurrentUser>('PUT', endpoints.account.profile, { body: { ...data, role: legacyRole(data.profession) } }),

  changePassword: (data: { currentPassword: string; newPassword: string; confirmNewPassword: string }) =>
    request<{ changed: boolean }>('POST', endpoints.account.password, { body: data }),

  getCompany: () => request<CompanyProfile>('GET', endpoints.companyProfile),

  saveCompany: (data: Omit<CompanyProfile, 'id'>) =>
    request<CompanyProfile>('PUT', endpoints.companyProfile, { body: data }),
}
