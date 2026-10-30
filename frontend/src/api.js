import axios from 'axios'

const apiBaseUrl = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '')
const FOOD_ANALYSIS_TIMEOUT_MS = 45000

const api = axios.create({
  baseURL: `${apiBaseUrl}/api`,
  timeout: 120000,
})

const postFoodImage = async (endpoint, imageFile, params) => {
  const formData = new FormData()
  formData.append('image', imageFile)
  const startedAt = performance.now()
  console.info('[FoodAPI] Request started', {
    endpoint,
    imageBytes: imageFile.size,
    imageType: imageFile.type,
  })

  try {
    const response = await api.post(endpoint, formData, {
      params,
      timeout: FOOD_ANALYSIS_TIMEOUT_MS,
    })
    console.info('[FoodAPI] Response received', {
      endpoint,
      status: response.status,
      elapsedMs: Number((performance.now() - startedAt).toFixed(2)),
      requestId: response.headers['x-request-id'],
    })
    return response.data
  } catch (error) {
    console.error('[FoodAPI] Request failed', {
      endpoint,
      elapsedMs: Number((performance.now() - startedAt).toFixed(2)),
      status: error.response?.status,
      code: error.code,
      requestId: error.response?.headers?.['x-request-id'],
    })
    throw error
  }
}

export const predictFood = async (imageFile) => {
  return postFoodImage('/predict-food', imageFile)
}

export const predictFoodTopK = async (imageFile, k = 5) => {
  return postFoodImage('/predict-food/top-k', imageFile, { k })
}

export const getFoodAnalysisErrorMessage = (error) => {
  const detail = error.response?.data?.detail
  if (typeof detail === 'string' && detail.trim()) return detail
  if (typeof detail?.message === 'string') return detail.message

  switch (error.response?.status) {
    case 400:
      return 'This image could not be processed. Choose a valid JPEG, PNG, or WebP under 5 MB.'
    case 422:
      return 'The analysis request was invalid. Please select the image and try again.'
    case 429:
      return 'The analysis service is busy. Wait a moment, then try again.'
    case 500:
      return 'Food analysis failed on the server. Please try again later.'
    case 503:
      return 'The food model is not ready. Check the backend model checkpoint and try again later.'
    case undefined:
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        return 'Food analysis timed out. Check that the backend is responsive, then try again.'
      }
      if (error.code === 'ERR_NETWORK' || !error.response) {
        return 'Could not reach the analysis backend. Check the backend URL and that the server is running.'
      }
      break
    default:
      break
  }
  return error.message || 'Food analysis failed. Please try again.'
}

export const predictBodyFat = async (images, weightKg = 70, heightCm = 175, gender = 'male', age = 25) => {
  const formData = new FormData()
  formData.append('front', images.front)
  formData.append('back', images.back)
  formData.append('left', images.left)
  formData.append('right', images.right)
  formData.append('weight_kg', weightKg)
  formData.append('height_cm', heightCm)
  formData.append('gender', gender)
  formData.append('age', age)
  const response = await api.post('/predict-bodyfat', formData)
  return response.data
}

export default api
