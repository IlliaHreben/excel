import React from 'react'
import ReactDOM from 'react-dom'
import { Backdrop, CircularProgress } from '@material-ui/core'
import { makeStyles } from '@material-ui/core/styles'

const useStyles = makeStyles((theme) => ({
  backdrop: {
    zIndex: theme.zIndex.drawer + 1,
    color: '#fff',
  },
}))

const BackDrop = props => {
  const classes = useStyles()

  return ReactDOM.createPortal(
      <Backdrop className={ classes.backdrop } open={ props.open }>
          <CircularProgress color='inherit' />
      </Backdrop>,
    document.getElementsByTagName('body')[ 0 ]
  )
}

export default BackDrop