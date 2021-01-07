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

  const fetchXls = async acceptedFiles => {
    try {
      const formData = new FormData();

      acceptedFiles.forEach(file => formData.append('xls', file))

      const res = await handleApiResponse( fetch('/api/xls', {
        method: 'POST',
        body: formData
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
      window.location.replace(`/${ destination }.xlsx`)
      // await fetch(`/api/${ destination }.xlsx`)

      // setFilesInfo(res)
    } catch (err) {
      console.log(err);
    }
  }
  return (
      <div    className = "App">
          <header className = "App-header">
              <DropZone
          fetchXls={ fetchXls }
          fetchXlsx={ fetchXlsx }
          // handleError    = { handleError }
          // handleModal    = { this.handleMountModal }
          // renderBackDrop = { this.renderBackDrop }
        />
          </header>
      </div>
  )
}

export default App
