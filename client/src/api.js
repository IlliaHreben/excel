export const telegramNotification = async (body) => {
    const res = await fetch('/api/telegramNotification', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-type': 'application/json' }
      })
}