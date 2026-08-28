import * as React from "react"
import Svg, { Circle, Path, SvgProps } from "react-native-svg"
// import * as React from "react"
// import Svg, { Path } from "react-native-svg"

interface CircleDotIconProps extends SvgProps {
  isSelected?: boolean
}

function CircleDotIcon({ isSelected = false, ...props }: CircleDotIconProps) {
  return (
     <Svg
    width={props.width}
      height={props.height}
    viewBox="0 0 512 512"
    {...props}
  >
    <Path
      d="M448,256c0-106-86-192-192-192S64,150,64,256s86,192,192,192S448,362,448,256Z"
        fill="#fff"
        stroke="#fff"
        strokeMiterlimit={10}
        strokeWidth={32}
    />
    {!isSelected && <Circle cx={256} cy={256} r={144} />}
  </Svg>
  )
}

// export default SvgComponent



export default CircleDotIcon;