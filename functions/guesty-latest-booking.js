const { getLatestReservation } = require('./_lib/guesty')

exports.handler = async () => {
  try {
    const booking = await getLatestReservation()

    return {
      statusCode: 200,
      body: JSON.stringify({
        connected: true,
        booking,
      }),
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        connected: false,
        error: error.message,
      }),
    }
  }
}
