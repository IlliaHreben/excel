import React, { useState } from 'react'
import './App.css'
import { Snackbar } from '@material-ui/core'
import { Alert } from '@material-ui/lab'

import DropZone from './components/DropZone'
import BackDrop from './components/BackDrop'

import { telegramNotification } from './api'

export const handleApiResponse = promise => {
  return promise
    .then(res => res.text())
    .then(JSON.parse)
    .then(body => {
      if (body.ok) {
        return body.data
      }
      telegramNotification(body.error)
      throw new Error(body.error)
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
    } catch (error) {
      console.log(error);
      setAlertMessage(error.message)
    }
  }
  const fetchXlsx = async (filesInfo) => {
    const destination = filesInfo[ 0 ].destination;
    try {
      await handleApiResponse(
        fetch(`/api/xlsx?destination=${ destination }`)
      )
    } catch (error) {
      setAlertMessage(error.message)
      setDidRenderBackDrop(false)
      return
    }
    setDidRenderBackDrop(false)

    window.location.replace(`/${ destination }.xlsx`)
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
