
const qs = require('querystring')
const axios = require('axios')
const convert = require('xml-js')

const host = 'https://www.goodreads.com'
const key = 'ODgzR3MZCnBiqE1w39MPzQ'
const convertOpts = {compact: true, trim: true}

const mapSearchRecords = (records) => {
  if (Array.isArray(records)) {
    return records.map(record => ({
      key: record ? record.id._text : null,
      id: record && record.best_book ? record.best_book.id._text : null,
      title: record && record.best_book ? record.best_book.title._text : '',
      averageRating: record ? record.average_rating._text : 0.0,
      ratingsCount: record ? record.ratings_count._text : 0,
      reviewsCount: record ? record.text_reviews_count._text : 0,
      imageSrc: record && record.best_book ? record.best_book.image_url._text : '',
      author: record && record.best_book ? record.best_book.author.name._text : ''
    }))
  }
}

const validateSearchRecords = (result) => {
  return (result.hasOwnProperty('GoodreadsResponse')
    ? result.GoodreadsResponse.hasOwnProperty('search')
    ? result.GoodreadsResponse.search.hasOwnProperty('results')
    ? result.GoodreadsResponse.search.results.hasOwnProperty('work')
    ? result.GoodreadsResponse.search.results.work
    : []
    : []
    : []
    : []
  )
}

const validateDetails = (result) => {
  return (result.hasOwnProperty('GoodreadsResponse')
      ? result.GoodreadsResponse.hasOwnProperty('book')
      ? result.GoodreadsResponse.book
      : null
      : null
    )
}

const getAuthors = (authors) => {
  if (Array.isArray(authors)) {
    let authorString = authors.reduce((authorStr, author) => (
      `${authorStr} ${author.name._text},`
    ), '')
    authorString = authorString.trim()
    return authorString[authorString.length - 1] === ','
      ? authorString.slice(0, -1) : authorString
  }
  return authors.name._text
}

const formatBookDetails = (details) => ({
  id: details ? details.id._text : null,
  title: details ? details.title._text : '',
  imageSrc: details ? details.image_url._text : '',
  author: details ? getAuthors(details.authors.author) : '',
  averageRating: details ? details.average_rating._text : 0.0,
  ratingsCount: details ? details.ratings_count._cdata : 0,
  reviewsCount: details ? details.text_reviews_count._cdata : 0,
  description: details ? details.description._cdata : ''
})

const searchResultsApi = async (req, res) => {
  const { q = ''} = req.query
  const query = qs.stringify({ q, key, search: 'title' })
  const url = `${host}/search?${query}`
  try {
    const response = await axios.get(url)
    const result = convert.xml2js(response.data, convertOpts)
    const records = validateSearchRecords(result)
    res.json(mapSearchRecords(records))
  } catch (ex) {
    if (ex && ex.response && parseInt(ex.response.status)) {
      res.status(ex.response.status).send(ex.response.statusText)
    } else {
      res.status(500).send(ex)
    }
  }
}

const bookDetailsApi = async (req, res) => {
  const { id } = req.params
  if (isNaN(id)) {
    return res.status(400).send('Book id can only be a number')
  }

  const query = qs.stringify({ id, key, text_only: true})
  const url = `${host}/book/show?${query}`
  try {
    const response = await axios.get(url)    
    const result = convert.xml2js(response.data, convertOpts)
    let details = validateDetails(result)
    details = formatBookDetails(details)
    res.send(details)
  } catch (ex) {
    if (ex && ex.response && parseInt(ex.response.status)) {
      res.status(ex.response.status).send(ex.response.statusText)
    } else {
      res.status(500).send(ex)
    }
  }
}

module.exports = {
  searchResultsApi,
  bookDetailsApi
}
