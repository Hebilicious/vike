export { parseGlobResults }

import { assert, hasProp, isCallable, isObject, cast, assertUsage } from '../utils.js'
import { assertExportValues } from './assertExports.js'
import { getPageFileObject, type PageFile } from './getPageFileObject.js'
import { fileTypes, type FileType } from './fileTypes.js'
import type { PageConfig, PageConfigGlobal } from '../page-configs/PageConfig.js'
import { assertPageConfigGlobal, assertPageConfigs } from './assertPageConfigs.js'

function parseGlobResults(pageFilesExports: unknown): {
  pageFiles: PageFile[]
  pageConfigs: PageConfig[]
  pageConfigGlobal: PageConfigGlobal
} {
  assert(hasProp(pageFilesExports, 'isGeneratedFile'))
  assert(pageFilesExports.isGeneratedFile !== false, `vike was re-installed(/re-built). Restart your app.`)
  assert(pageFilesExports.isGeneratedFile === true, `\`isGeneratedFile === ${pageFilesExports.isGeneratedFile}\``)
  assert(hasProp(pageFilesExports, 'pageFilesLazy', 'object'))
  assert(hasProp(pageFilesExports, 'pageFilesEager', 'object'))
  assert(hasProp(pageFilesExports, 'pageFilesExportNamesLazy', 'object'))
  assert(hasProp(pageFilesExports, 'pageFilesExportNamesEager', 'object'))
  assert(hasProp(pageFilesExports.pageFilesLazy, '.page'))
  assert(
    hasProp(pageFilesExports.pageFilesLazy, '.page.client') || hasProp(pageFilesExports.pageFilesLazy, '.page.server')
  )
  assert(hasProp(pageFilesExports, 'pageFilesList', 'string[]'))

  assert(hasProp(pageFilesExports, 'pageConfigs'))
  assert(hasProp(pageFilesExports, 'pageConfigGlobal'))
  const { pageConfigs, pageConfigGlobal } = pageFilesExports
  assertPageConfigs(pageConfigs)
  parsePageConfigs(pageConfigs)
  assertPageConfigGlobal(pageConfigGlobal)

  const pageFilesMap: Record<string, PageFile> = {}
  parseGlobResult(pageFilesExports.pageFilesLazy).forEach(({ filePath, pageFile, globValue }) => {
    pageFile = pageFilesMap[filePath] = pageFilesMap[filePath] ?? pageFile
    const loadModule = globValue
    assertLoadModule(loadModule)
    pageFile.loadFile = async () => {
      if (!('fileExports' in pageFile)) {
        pageFile.fileExports = await loadModule()
        assertExportValues(pageFile)
      }
    }
  })
  parseGlobResult(pageFilesExports.pageFilesExportNamesLazy).forEach(({ filePath, pageFile, globValue }) => {
    pageFile = pageFilesMap[filePath] = pageFilesMap[filePath] ?? pageFile
    const loadModule = globValue
    assertLoadModule(loadModule)
    pageFile.loadExportNames = async () => {
      if (!('exportNames' in pageFile)) {
        const moduleExports = await loadModule()
        // Vite 2 seems to choke following assertion: https://github.com/vikejs/vike/issues/455
        assertUsage(
          'exportNames' in moduleExports,
          'You seem to be using Vite 2 but the latest vike versions only work with Vite 3'
        )
        assert(hasProp(moduleExports, 'exportNames', 'string[]'), pageFile.filePath)
        pageFile.exportNames = moduleExports.exportNames
      }
    }
  })
  // `pageFilesEager` contains `.page.route.js` files
  parseGlobResult(pageFilesExports.pageFilesEager).forEach(({ filePath, pageFile, globValue }) => {
    pageFile = pageFilesMap[filePath] = pageFilesMap[filePath] ?? pageFile
    const moduleExports = globValue
    assert(isObject(moduleExports))
    pageFile.fileExports = moduleExports
  })
  parseGlobResult(pageFilesExports.pageFilesExportNamesEager).forEach(({ filePath, pageFile, globValue }) => {
    pageFile = pageFilesMap[filePath] = pageFilesMap[filePath] ?? pageFile
    const moduleExports = globValue
    assert(isObject(moduleExports))
    assert(hasProp(moduleExports, 'exportNames', 'string[]'), pageFile.filePath)
    pageFile.exportNames = moduleExports.exportNames
  })

  pageFilesExports.pageFilesList.forEach((filePath) => {
    pageFilesMap[filePath] = pageFilesMap[filePath] ?? getPageFileObject(filePath)
  })

  const pageFiles = Object.values(pageFilesMap)
  pageFiles.forEach(({ filePath }) => {
    assert(!filePath.includes('\\'))
  })

  return { pageFiles, pageConfigs, pageConfigGlobal }
}

type GlobResult = { filePath: string; pageFile: PageFile; globValue: unknown }[]
function parseGlobResult(globObject: Record<string, unknown>): GlobResult {
  const ret: GlobResult = []
  Object.entries(globObject).forEach(([fileType, globFiles]) => {
    cast<FileType>(fileType)
    assert(fileTypes.includes(fileType))
    assert(isObject(globFiles))
    Object.entries(globFiles).forEach(([filePath, globValue]) => {
      const pageFile = getPageFileObject(filePath)
      assert(pageFile.fileType === fileType)
      ret.push({ filePath, pageFile, globValue })
    })
  })
  return ret
}

function assertLoadModule(globValue: unknown): asserts globValue is () => Promise<Record<string, unknown>> {
  assert(isCallable(globValue))
}

function parsePageConfigs(pageConfigs: PageConfig[]) {
  // TODO: remove
  /*
  pageConfigs.forEach((pageConfig) => {
    Object.entries(pageConfig.configElements).forEach(([configName, configElement]) => {
      {
        const { configValueSerialized } = configElement
        if (configValueSerialized !== undefined) {
          configElement.configValue = parse(configValueSerialized)
        }
      }
      if (configName === 'route') {
        assertRouteConfigValue(configElement)
      }
    })
  })
  */
}

// TODO: use again
// function assertRouteConfigValue(configElement: ConfigElement) {
//   assert(hasProp(configElement, 'configValue')) // route files are eagerly loaded
//   const { configValue } = configElement
//   const configValueType = typeof configValue
//   assertUsage(
//     configValueType === 'string' || isCallable(configValue),
//     `${configElement.configDefinedAt} has an invalid type '${configValueType}': it should be a string or a function instead, see https://vike.dev/route`
//   )
//   /* We don't do that to avoid unnecessarily bloating the client-side bundle when using Server Routing
//    *  - When using Server Routing, this file is loaded as well
//    *  - When using Server Routing, client-side validation is superfluous as Route Strings only need to be validated on the server-side
//   if (typeof configValue === 'string') {
//     assertRouteString(configValue, `${configElement.configDefinedAt} defines an`)
//   }
//   */
// }
