BEGIN TRY
    BEGIN TRANSACTION;

    IF OBJECT_ID('tempdb..#SolicitudCandidates') IS NOT NULL
        DROP TABLE #SolicitudCandidates;

    SELECT
        s.id,
        s.usuarioOID AS usuarioOIDActual,
        CASE
            WHEN LOWER(s.usuarioOID) LIKE '%@trsa.es'
                THEN LEFT(s.usuarioOID, LEN(s.usuarioOID) - LEN('@trsa.es')) + '@tecnicasreunidas.es'
            WHEN LOWER(s.usuarioOID) LIKE '%@industrial.initec.es'
                THEN LEFT(s.usuarioOID, LEN(s.usuarioOID) - LEN('@industrial.initec.es')) + '@tecnicasreunidas.es'
        END AS usuarioOIDNuevo
    INTO #SolicitudCandidates
    FROM Solicitudes s
    WHERE LOWER(s.usuarioOID) LIKE '%@trsa.es'
       OR LOWER(s.usuarioOID) LIKE '%@industrial.initec.es';

    UPDATE s
    SET
        s.usuarioOID = c.usuarioOIDNuevo,
        s.updatedAt = GETDATE()
    FROM Solicitudes s
    JOIN #SolicitudCandidates c
        ON c.id = s.id;

    SELECT @@ROWCOUNT AS registrosActualizados;

    SELECT
        id,
        usuarioOIDActual,
        usuarioOIDNuevo
    FROM #SolicitudCandidates
    ORDER BY id;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;

    THROW;
END CATCH;