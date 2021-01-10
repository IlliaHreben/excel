import React, { useState } from 'react'
import './App.css'

import DropZone from './components/DropZone'
import BackDrop from './components/BackDrop'

export const handleApiResponse = promise => {
  return promise
    .then(res => res.text())
    .then(JSON.parse)
    .then(body => {
      if (body.ok) {
        return body.data
      }
      throw body.error
    })
}

function App() {

  const [ didRenderBackDrop, setDidRenderBackDrop ] = useState(false)

  const fetchXls = async acceptedFiles => {
    try {
      setDidRenderBackDrop(true)

      const formData = new FormData();

      acceptedFiles.forEach(file => formData.append('xls', file))

      const res = await handleApiResponse( fetch('/api/xls', {
        method : 'POST',
        body   : formData
      }))
      return res
    } catch (err) {
      console.log(err);
    }
  }
  const fetchXlsx = async (filesInfo) => {
    try {
      const destination = filesInfo[ 0 ].destination;
      await fetch(`/api/xlsx?destination=${ destination }`)
      
      setDidRenderBackDrop(false)
      window.location.replace(`/${ destination }.xlsx`)
    } catch (err) {
      console.log(err);
    }
  }
  return (
      <div    className = "App">
          <header className = "App-header">
              <DropZone
                fetchXls  = { fetchXls }
                fetchXlsx = { fetchXlsx }
              />
              <BackDrop open = { didRenderBackDrop } />
          </header>
      </div>
  )
}

export default App
