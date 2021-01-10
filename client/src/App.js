import React, { useState } from 'react'
import './App.css'
import { Snackbar } from '@material-ui/core'
import { Alert } from '@material-ui/lab'

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
  const [ alertMessage, setAlertMessage ] = useState('')

  const fetchXls = async acceptedFiles => {
    try {
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
                fetchXls = { fetchXls }
                fetchXlsx = { fetchXlsx }
                setAlertMessage={ setAlertMessage }
                setDidRenderBackDrop= { setDidRenderBackDrop }
              />
              <BackDrop open={ didRenderBackDrop } />
              <Snackbar
                open={ !!alertMessage }
                autoHideDuration={ 3000 }
                onClose={ () => setAlertMessage('') }
                anchorOrigin={ { vertical: 'top', horizontal: 'center' } }
              >
                  <Alert variant='filled' severity='error'>
                      {alertMessage}
                  </Alert>
              </Snackbar>
          </header>
      </div>
  )
}

export default App
