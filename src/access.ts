const TOTP_DURATION_IN_MINUTES = 3

/** Create a timed access ticket. */
export function createTimedAccessTicket() {
  // @todo #1 create a timed access ticket in the HikVision database.
  // @todo #1 schedule a cronjob to delete this ticket after the timeout.
}

export function deleteTimedAccessTicket(id: string) {
  // @todo #1 delete the ticket from the HikVision database.
}
