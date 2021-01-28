import React, { useCallback, useMemo } from 'react'
import { useDropzone }      from 'react-dropzone'
import { FontAwesomeIcon }  from '@fortawesome/react-fontawesome'
import { faCloudUploadAlt } from '@fortawesome/free-solid-svg-icons'

import { getUserBrowser, parseFiles } from '../utils'
import { telegramNotification } from '../api'

export default function DropZone (props) {
  const baseStyle = {
    flex          : 1,
    display       : 'flex',
    flexDirection : 'column',
    alignItems    : 'center',
    padding       : '20px',
    borderWidth   : 2,
    borderStyle   : 'dashed',
    color         : '#999999',
    outline       : 'none',
    transition    : 'border .3s ease-in-out'
  }
  const activeStyle = {
    borderColor : '#2196f3'
  }
  const acceptStyle = {
    borderColor : '#00e676'
  }
  const rejectStyle = {
    borderColor : '#ff1744'
  }

  const onDrop = useCallback(async acceptedFiles => {
    if (!acceptedFiles.length) return
    try {

      props.setDidRenderBackDrop(true)
      const filesInfo = await props.fetchXls(acceptedFiles)

      await props.fetchXlsx(filesInfo)  
    } catch (error) {
      await telegramNotification({
        error: JSON.stringify(error, Object.getOwnPropertyNames(error))
      })
      props.setAlertMessage(error.message)
      props.setDidRenderBackDrop(false)
    }
      
  }, [ props ])

  const onDropRejected = async (rejectedFiles) => {
    if (!rejectedFiles.length) return
    await telegramNotification({
      browser: getUserBrowser(),
      files: parseFiles(rejectedFiles)
    })
      props.setAlertMessage('Invalid format. Only .xls files.')
  }

  const onDropAccepted = async (acceptedFiles) => {
    await telegramNotification({
      browser: getUserBrowser(),
      files: parseFiles(acceptedFiles)
    })
  }

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragAccept,
    isDragReject
  } = useDropzone({ onDrop, onDropRejected, onDropAccepted })

  const style = useMemo(() => ({
    ...baseStyle,
    ...(isDragActive ? activeStyle : {}),
    ...(isDragAccept ? acceptStyle : {}),
    ...(isDragReject ? rejectStyle : {})
  }), [ baseStyle, isDragActive, activeStyle, isDragAccept, acceptStyle, isDragReject, rejectStyle ])

  return (
      <div { ...getRootProps({ className: 'dropZone', style }) }>
          <input { ...getInputProps({ multiple: true, accept: 'application/vnd.ms-excel' }) } />
          {!isDragActive
        ? (<>
            <UploadIcon color = '#3f51b5' />
            <p>Drag 'n' drop some files here, or click to select files</p>
            <p>(Only *.xls files will be accepted)</p>
        </>)
        : (<>
            <UploadIcon color = '#303f9f' />
            {isDragAccept? <p>Yeah. Drop here!</p> : <p>NO NO NO!!! Bad format!!!</p>}
            <br />
        </>)
      }

      </div>
  )
}

const UploadIcon = props => {
  return <FontAwesomeIcon color = { props.color } icon = { faCloudUploadAlt } size = '8x' />
}