import React, { useState } from 'react'
import './App.css'

import DropZone from './components/DropZone'

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

  const [ filesInfo, setFilesInfo ] = useState([])

  const fetchXls = async acceptedFiles => {
    try {
      const formData = new FormData();

      acceptedFiles.forEach(file => formData.append('xls', file))

      const res = await handleApiResponse( fetch('/api/xls', {
        method: 'POST',
        body: formData
      }))

      setFilesInfo(res)
    } catch (err) {
      console.log(err);
    }
  }
  return (
      <div    className = "App">
          <header className = "App-header">
              <DropZone
          fetchXls     = { fetchXls }
          // handleError    = { handleError }
          // handleModal    = { this.handleMountModal }
          // renderBackDrop = { this.renderBackDrop }
        />
          </header>
      </div>
  )
}

export default App
