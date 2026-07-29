import * as React from "react"
import Svg, { Path, SvgProps } from "react-native-svg"
// import * as React from "react"
// import Svg, { Path } from "react-native-svg"

function MusicIcon(props:SvgProps) {
  return (
    <Svg
      width={props.width}
      height={props.height}
      viewBox="0 0 24 24"
      fill="#000"
      // xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <Path
        d="M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2m0 0V5l12-2v14m0 0c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2M9 9l12-2"
        fill={props.color}
      />
    </Svg>
  )
}

// export default SvgComponent



export default MusicIcon;

