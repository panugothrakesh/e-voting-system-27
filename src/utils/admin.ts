export const isAdmin = (address: string | undefined) => {
  if (!address) return false
  return address.toLowerCase() === process.env.NEXT_PUBLIC_ADMIN_ADDRESS?.toLowerCase()
} 