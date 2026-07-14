export function getTodayDateKey() {
  return new Intl.DateTimeFormat(
    'en-CA',
    {
      timeZone: 'America/Sao_Paulo',
    }
  ).format(new Date());
}